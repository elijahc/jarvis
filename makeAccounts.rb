require 'optparse'
require 'fileutils'
require 'awesome_print'

class MakeAccounts

  def initialize( new_options = {} )


    @options                              = {}
    @options[:default_creds_directory]    = './creds/'
    @options[:default_quantity]           = 2
    @options[:default_delay]              = 1800 # 30 minutes

    @options[:quantity]                   = @options[:default_quantity]
    @options[:creds_directory]            = @options[:default_creds_directory]
    @options[:delay]                      = @options[:default_delay]
    @options[:name_list]                  = ''
    @options[:pass_list]                  = ''
    @options[:dj_list]                    = ''

    if new_options.empty?
      parseCommandLine
    else
      @options.merge! new_options
    end

  end

  def parseCommandLine

    OptionParser.new do |opts|

      opts.on( '--delay DELAY', "Average delay (in sec) between each account creation. Default: #{ @options[:default_quantity] }" ) do |value|
        @options[:delay] = value.to_i
      end

      opts.on( '--quantity QUANTITY', "How many bots to invoke. Default: #{ @options[:default_quantity] }" ) do |value|
        @options[:quantity] = value.to_i
      end


      opts.on( '--pass LIST', "Name to use in signup" ) do |value|
        @options[:pass_list] = value
      end

      opts.on( '--dj LIST', "Name to use in signup" ) do |value|
        @options[:dj_list] = value
      end

      opts.on( '--name LIST', "Name to use in signup" ) do |value|
        @options[:name_list] = value
      end

    end.parse!

    nil
  end

  def run

    # read in list of names
    name_list = File.open(@options[:name_list], 'r').readlines("\n")
    pass_list = File.open(@options[:pass_list], 'r').readlines("\n")
    dj_list   = File.open(@options[:dj_list], 'r').readlines("\n")
    @options[:quantity].times do |index|
      name = name_list.pop()
      pass = pass_list.pop()
      dj   = dj_list.pop()
      cmd = "ruby register.rb --email #{name.strip} --pass #{pass.strip} --name #{dj.strip}"
      puts cmd
      `#{cmd}`
      shift = ( ( Random.rand - 0.5 )*@options[:delay]*0.3 )
      delay = @options[:delay]+shift
      ap "Delaying for #{delay}"
      sleep(delay)
    end


  end

end

if( __FILE__ == $0 )
  begin
    # Run it!
    MakeAccounts.new.run
  rescue => error
    ap( error )
  end
end
