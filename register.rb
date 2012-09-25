require 'json'
require 'optparse'
require 'fileutils'
require 'awesome_print'
require 'watir-webdriver'


class TTRegister

  def initialize( new_options = {} )


    @options                              = {}
    @options[:default_creds_directory]    = './creds/'

    @options[:quantity]                   = @options[:default_quantity]
    @options[:creds_directory]            = @options[:default_creds_directory]
    @options[:dj_name]                    = ''
    @options[:pass]                       = ''
    @options[:email]                      = ''

    if new_options.empty?
      parseCommandLine
    else
      @options.merge! new_options
    end

    nil
  end

  def parseCommandLine

    OptionParser.new do |opts|

      opts.on( '--name NAME', "Name to use in signup" ) do |value|
        @options[:dj_name] = value
      end

      opts.on( '--pass PASSWORD', "password to use for signup" ) do |value|
        @options[:pass] = value
      end

      opts.on( '--email EMAIL', "Email to use for signup." ) do |value|
        @options[:email] = value
      end

      opts.on( '--creds_directory PATHTOCREDS', "Path to the bots credentials directory. Default: #{ @options[:default_creds_directory] }" ) do |value|
        @options[:creds_directory] = value
      end

    end.parse!

    nil
  end

  def run

    b = Watir::Browser.new
    b.goto('turntable.fm')
    b.execute_script('ttlogin.registerShow(FB, login)')
    b.text_field(:name => 'email').set(@options[:email])
    b.text_field(:name => 'password').set(@options[:pass])
    b.text_field(:name => 'password-verify').set(@options[:pass])
    b.text_field(:name => 'dj-name').set(@options[:dj_name])
    b.button(:class => 'submit').click()
    b.link(:id => 'skip-this-step').when_present.click()

    b.goto('turntable.fm/janking')

    b.div(:class => 'start').when_present.click()
    b.div(:class => 'next').when_present.click()
    b.div(:class => 'next').when_present.click()
    b.div(:class => 'next').when_present.click()
    b.div(:class => 'done').when_present.click()

    begin
      creds = b.execute_script('alert(turntable.user.auth+","+turntable.user.id)').split(',')
    rescue => e
      ap e
    end
    # TODO: write creds to file

    File.open("#{@options[:creds_directory]}#{@options[:dj_name]}_creds.js", 'w') do |file|
      file.puts "var AUTH    = \"#{creds[0]}\""
      file.puts "var USERID  = \"#{creds[1]}\""
      file.puts "var name    = \"#{@options[:dj_name]}\""

      file.puts "// Password: #{@options[:pass]}"
      file.puts ""

      file.puts "exports.AUTH    = AUTH"
      file.puts "exports.USERID  = USERID"
      file.puts "exports.name    = name"
    end
    begin
      b.close()
    rescue
    end
    nil

  end

end

if( __FILE__ == $0 )
  begin
    # Run it!
    TTRegister.new.run
  rescue => error
    ap( error )
  end
end
