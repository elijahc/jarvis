require 'json'
require 'optparse'
require 'fileutils'
require 'awesome_print'

class ManageBotnet

  def initialize( new_options = {} )


    @options                              = {}
    @options[:default_quantity]           = 3
    @options[:default_creds_directory]    = './creds/'
    @options[:default_room]               = './creds/janking_room.js'
    @options[:default_master]             = './creds/jarvis_creds.js'
    @options[:default_delay]              = 510

    @options[:quantity]                   = @options[:default_quantity]
    @options[:creds_directory]            = @options[:default_creds_directory]
    @options[:room]                       = @options[:default_room]
    @options[:master]                     = @options[:default_master]
    @options[:delay]                      = @options[:default_delay]

    if new_options.empty?
      parseCommandLine
    else
      @options.merge! new_options
    end

  end

  def parseCommandLine

    OptionParser.new do |opts|

      opts.on( '--master MASTER', "What room file to direct bots too  Default: #{ @options[:default_room] }" ) do |value|
        @options[:master] = value
      end

      opts.on( '--room ROOMFILE', "What room file to direct bots too  Default: #{ @options[:default_room] }" ) do |value|
        @options[:room] = value
      end

      opts.on( '--delay DELAY', "How many bots to invoke. Default: #{ @options[:default_quantity] }" ) do |value|
        @options[:delay] = value.to_i
      end

      opts.on( '--quantity QUANTITY', "How many bots to invoke. Default: #{ @options[:default_quantity] }" ) do |value|
        @options[:quantity] = value.to_i
      end

      opts.on( '--creds_directory PATHTOCREDS', "Path to the bots credentials directory. Default: #{ @options[:default_creds_directory] }" ) do |value|
        @options[:creds_directory] = value
      end

    end.parse!

    nil
  end

  def run
    cred_arr = Array.new
    # get all the names of the cred files
    creds = `find . -type f -name \"*_creds.js\" `.split("\n")
    @options[:quantity].times do
      credentials = creds.sample
      ap credentials
      if ( credentials != @options[:master] )
        # read credentials file and extract userid and name
        @cred_arr = File.open(credentials).readlines[1..3]
        id = @cred_arr[0].strip.scan(/var USERID\s+= "(.+)"/)[0][0]
        name = @cred_arr[1].strip.scan(/var name\s+= "(.+)"/)[0][0]
        ap id
        ap name
        cred_arr << {:userid => id, :dj_name => name }

        # Spawn the bot
        pid = spawnBot(credentials, 'slave')
        puts "Started slave pid: #{ pid }"
        sleep(@options[:delay])
      end
    end

    # build slaves file
    File.open('slaves.js', 'w') do |file|
      file.puts "slaves = ["
      ap cred_arr
      cred_arr.each do |bot|
        file.puts "{ userId: '#{ bot[:userid] }', name: '#{ bot[:dj_name] }'},"
      end
      file.puts "]"
      file.puts "function getRandomSlave(){
                    var idx = Math.round(Math.random()*(slaves.length-1))
                    return slaves[idx]
                }

                exports.length         = slaves.length
                exports.getRandomSlave = getRandomSlave"

    end

    # launch master
    pid = spawnBot(@options[:master], 'master')
    puts ""
    puts "Started master pid: #{ pid }"

    nil
  end

  def spawnBot(creds, level)
      if pid = fork
        # Parent process, start bot
        Process.detach( pid )

        return pid

      else
        # Child process
        cmd = "node jarvis.js --creds #{creds} --room #{@options[:room]} --#{level}"
        puts cmd
        exec(cmd)
      end
  end
end

if( __FILE__ == $0 )
  begin
    # Run it!
    botnet = ManageBotnet.new
    botnet.run
  rescue => error
    ap( error )
    puts error.backtrace
  end
end
